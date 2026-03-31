const mongoose = require("mongoose");
const UserLiveLocation = require("./UserLiveLocation");
const UserLocationHistory = require("./UserLocationHistory");
const UserDutySession = require("./UserDutySession");


function getModel(db, definition) {
  return db.models[definition.modelName] || db.model(definition.modelName, definition.schema, definition.collectionName);
}

function getLocationModelsForDb(db) {
  return {
    UserLiveLocation: getModel(db, UserLiveLocation),
    UserLocationHistory: getModel(db, UserLocationHistory),
    UserDutySession: getModel(db, UserDutySession),
  };
}

function getLocationModelsForTenantDbName(dbName) {
  const db = mongoose.connection.useDb(dbName, { useCache: true });
  return getLocationModelsForDb(db);
}

module.exports = { getLocationModelsForDb, getLocationModelsForTenantDbName };
