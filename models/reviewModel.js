// models/reviewModel.js
const mongoose = require('mongoose');
const Tour = require('./tourModel');
const User = require('./userModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populate user data in all find queries
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// Calculate avg rating and quantity
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    { $match: { tour: tourId } },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Trigger rating calc after saving
reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// Store document before update/delete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.docToUpdate = await this.clone().findOne(); // FIX: use clone() to safely reuse
  console.log(this.docToUpdate);
  next();
});

// Use stored document to update ratings
reviewSchema.post(/^findOneAnd/, async function () {
  if (this.docToUpdate) {
    await this.docToUpdate.constructor.calcAverageRatings(this.docToUpdate.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
