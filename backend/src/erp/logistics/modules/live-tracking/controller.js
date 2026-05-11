const service = require("./service");

async function handle(res, fn) {
  try {
    const result = await fn();
    return res.status(result.status).json(result.body);
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Location module request failed" });
  }
}

function startDuty(req, res) {
  return handle(res, () => service.startDuty(req.trackingActor, req.validatedBody));
}

function update(req, res) {
  return handle(res, () => service.updateLocation(req.trackingActor, req.validatedBody.points));
}

function endDuty(req, res) {
  return handle(res, () => service.endDuty(req.trackingActor, req.validatedBody));
}

function liveUsers(req, res) {
  return handle(res, () => service.listLiveUsers(req.user));
}

function liveUser(req, res) {
  return handle(res, () => service.getLiveUser(req.user, req.validatedParams.userId));
}

function history(req, res) {
  return handle(res, () => service.getHistory(req.user, req.validatedParams.userId));
}

function dutySessions(req, res) {
  return handle(res, () => service.getDutySessions(req.user, req.validatedParams.userId));
}

function summary(req, res) {
  return handle(res, () => service.getSummary(req.user, req.validatedParams.userId));
}

module.exports = {
  startDuty,
  update,
  endDuty,
  liveUsers,
  liveUser,
  history,
  dutySessions,
  summary,
};