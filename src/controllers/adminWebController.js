const User = require('../models/user');
const Subscription = require('../models/subscription');
const AuditLog = require('../models/auditLog');

const getClientIp = (req) => req.ip || req.headers['x-forwarded-for'] || null;

const safeAuditLog = async (payload) => {
  try {
    await AuditLog.create(payload);
  } catch (_) {}
};

exports.listUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1, registrationDate: -1 })
      .limit(100);

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, role, emailVerified } = req.body;
    const patch = {};
    if (typeof username === 'string') patch.username = username.trim();
    if (typeof role === 'string') patch.role = role;
    if (typeof emailVerified === 'boolean') patch.emailVerified = emailVerified;

    const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await safeAuditLog({
      actor: req.admin?._id,
      actorIp: getClientIp(req),
      action: 'admin_web_user_update',
      target: 'User',
      targetId: user._id,
      status: 'success',
      details: `Updated user ${user.email}`
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.listSubscriptions = async (_req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('userId', 'email username')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: subscriptions.length, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { userId, plan, startsAt } = req.body;
    if (!userId || !plan) {
      return res.status(400).json({ success: false, message: 'userId and plan are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const subscription = await Subscription.create({
      userId,
      plan,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      status: 'active'
    });

    await safeAuditLog({
      actor: req.admin?._id,
      actorIp: getClientIp(req),
      action: 'admin_web_subscription_create',
      target: 'Subscription',
      targetId: subscription._id,
      status: 'success',
      details: `Created ${plan} subscription for ${user.email}`
    });

    res.status(201).json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { plan, status, endsAt } = req.body;
    const patch = {};
    if (typeof plan === 'string') patch.plan = plan;
    if (typeof status === 'string') patch.status = status;
    if (endsAt !== undefined) patch.endsAt = endsAt ? new Date(endsAt) : null;

    const subscription = await Subscription.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true
    });
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    await safeAuditLog({
      actor: req.admin?._id,
      actorIp: getClientIp(req),
      action: 'admin_web_subscription_update',
      target: 'Subscription',
      targetId: subscription._id,
      status: 'success',
      details: `Updated subscription ${subscription._id}`
    });

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'canceled', endsAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    await safeAuditLog({
      actor: req.admin?._id,
      actorIp: getClientIp(req),
      action: 'admin_web_subscription_cancel',
      target: 'Subscription',
      targetId: subscription._id,
      status: 'success',
      details: `Canceled subscription ${subscription._id}`
    });

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation/server error', error: error.message });
  }
};
