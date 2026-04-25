const roleService = require("./role.service");
async function list(req, res) { try { res.json({ ok: true, roles: await roleService.listRoles(req.query, req.user || {}) }); } catch (e) { res.status(500).json({ ok: false, message: e.message || "Unable to list roles" }); } }
async function create(req, res) { try { res.status(201).json({ ok: true, role: await roleService.createRole(req.body, req.user || {}) }); } catch (e) { res.status(400).json({ ok: false, message: e.message || "Unable to create role" }); } }
async function update(req, res) { try { res.json({ ok: true, role: await roleService.updateRole(req.params.id, req.body, req.user || {}) }); } catch (e) { res.status(400).json({ ok: false, message: e.message || "Unable to update role" }); } }
async function remove(req, res) { try { res.json({ ok: true, role: await roleService.deleteRole(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, message: e.message || "Unable to delete role" }); } }
module.exports = { list, create, update, remove };
