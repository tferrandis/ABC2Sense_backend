const { Schema, model } = require('mongoose');

const SubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    plan: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'canceled'],
      default: 'active'
    },
    startsAt: {
      type: Date,
      default: Date.now
    },
    endsAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = model('Subscription', SubscriptionSchema);
