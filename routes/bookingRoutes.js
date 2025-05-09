// const express= require('express');
// const bookingController = require('./../controllers/bookingController');
// const authController = require('./../controllers/authController');

// const router = express.Router();

// router.get(
//     '/checkout-session/:tourID', 
//     authController.protect, 
//     bookingController.getCheckoutSession
// ).post('/',
//     bookingController.createBookingCheckout
// );


// module.exports = router;


const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');

const router = express.Router();

// Stripe Webhook route (يجب أن يكون أول شيء، ولا يحتاج حماية)
router.post('/webhook-checkout', bookingController.webhookCheckout);

// Protect all routes after this middleware
router.use(authController.protect);

// Checkout session route (الحجز عن طريق Stripe Checkout)
router.get(
  '/checkout-session/:tourID',
  bookingController.getCheckoutSession
);

// باقي CRUD operations محمية فقط للمستخدمين المسموحين
router.use(authController.restrictTo('admin','user', 'lead-guide'));

router
  .route('/')
 .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
