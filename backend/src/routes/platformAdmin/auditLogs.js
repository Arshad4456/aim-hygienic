const express = require("express");
const PlatformAuditLog = require("../../models/PlatformAuditLog");
const router = express.Router();

function buildQuery(query){
 const q={}; if(query.companyId) q.companyId=query.companyId; if(query.actionType) q.actionType=query.actionType; if(query.actorUserId) q.actorUserId=query.actorUserId; if(query.targetType) q.targetType=query.targetType; if(query.search) q.summary={ $regex: String(query.search), $options:'i' }; if(query.dateFrom||query.dateTo){ q.createdAt={}; if(query.dateFrom) q.createdAt.$gte=new Date(query.dateFrom); if(query.dateTo) q.createdAt.$lte=new Date(query.dateTo); } return q;
}
router.get('/audit-logs', async (req,res)=>{ try{ const logs=await PlatformAuditLog.find(buildQuery(req.query||{})).sort({ createdAt:-1 }).limit(Number(req.query.limit||200)).lean(); return res.json({ success:true, logs }); } catch(error){ return res.status(500).json({ success:false, message:error.message||'Failed to load audit logs' }); } });
router.get('/audit-logs/:logId', async (req,res)=>{ const log=await PlatformAuditLog.findById(req.params.logId).lean(); if(!log) return res.status(404).json({ success:false, message:'Audit log not found' }); return res.json({ success:true, log }); });
router.get('/companies/:companyId/audit-logs', async (req,res)=>{ try{ const logs=await PlatformAuditLog.find({ ...buildQuery(req.query||{}), companyId:req.params.companyId }).sort({ createdAt:-1 }).limit(Number(req.query.limit||200)).lean(); return res.json({ success:true, logs }); } catch(error){ return res.status(500).json({ success:false, message:error.message||'Failed to load company audit logs' }); } });
router.get('/activity-feed', async (_req,res)=>{ const logs=await PlatformAuditLog.find().sort({ createdAt:-1 }).limit(30).lean(); return res.json({ success:true, items: logs }); });
module.exports = router;
