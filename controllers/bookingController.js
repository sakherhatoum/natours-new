const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory'); // لو تستخدم Generic CRUD Controllers

// ✅ 1) إنشاء جلسة Checkout مع Stripe
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. احضر معلومات الجولة المطلوبة
  const tour = await Tour.findById(req.params.tourID);
  if (!tour) return next(new AppError('No tour found with that ID', 404));
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // 2. أنشئ جلسة Checkout جديدة
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${req.protocol}://${req.get('host')}/`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: ['https://yourdomain.com/path-to-sample-image.jpg'], // يجب رابط صحيح
          },
        },
        quantity: 1,
      },
    ],
  });

  // 3. أرسل الجلسة للعميل
  res.status(200).json({
    status: 'success',
    session,
  });
});

// ✅ 2) إنشاء حجز جديد بعد الدفع (يُستخدم داخل Webhook)
const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100;

  await Booking.create({ tour, user, price });
};

// ✅ 3) استقبال Webhook الرسمي من Stripe
exports.webhookCheckout = async (req, res, next) => {
  console.log('webhooooooke')
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

// ✅ 4) CRUD عمليات التحكم بالحجوزات (باستخدام handlerFactory)

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
