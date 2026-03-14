const express = require("express");
const Company = require("../../models/Company");
const CompanyOnboardingState = require("../../models/CompanyOnboardingState");
const CompanySettings = require("../../models/CompanySettings");
const CompanyHierarchyConfig = require("../../models/CompanyHierarchyConfig");
const CompanyRoleConfig = require("../../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../../models/CompanyRoleModuleConfig");
const CompanyRoleModulePermission = require("../../models/CompanyRoleModulePermission");
const CompanyDocumentTemplate = require("../../models/CompanyDocumentTemplate");
const { ensureCompanyOrThrow } = require("./common");

const router = express.Router();
const STEP_KEYS = ["companyCreated","settingsConfigured","hierarchyAssigned","rolesAssigned","dashboardsGenerated","modulesAssigned","permissionsConfigured","documentTemplatesConfigured","setupCompleted"];

function summarize(state) {
 const steps = state?.steps || {}; const required = STEP_KEYS.filter(k=>k!== 'setupCompleted');
 return { totalRequired: required.length, completedCount: required.filter(k=>steps[k]).length, pendingSteps: required.filter(k=>!steps[k]), isComplete: Boolean(steps.setupCompleted) };
}
router.post('/companies/:companyId/onboarding/start', async (req,res)=>{
 try{ const company=await ensureCompanyOrThrow(req.params.companyId);
 let state=await CompanyOnboardingState.findOne({companyId:company._id});
 if(!state){ state=await CompanyOnboardingState.create({ companyId:company._id, currentStep:1, steps:{ companyCreated:true, settingsConfigured:false, hierarchyAssigned:false, rolesAssigned:false, dashboardsGenerated:false, modulesAssigned:false, permissionsConfigured:false, documentTemplatesConfigured:false, setupCompleted:false }, startedBy:req.user?.uid||req.user?._id }); }
 else if(!state.steps?.companyCreated){ state.steps.companyCreated=true; await state.save(); }
 return res.json({ success:true, onboarding: state, summary: summarize(state) }); }
 catch(error){ return res.status(error.status||500).json({ success:false, message:error.message||'Failed to start onboarding' }); }
});
router.get('/companies/:companyId/onboarding', async (req,res)=>{
 try{ await ensureCompanyOrThrow(req.params.companyId); const state=await CompanyOnboardingState.findOne({companyId:req.params.companyId}).lean(); if(!state) return res.status(404).json({ success:false, message:'Onboarding state not found' }); return res.json({ success:true, onboarding:state, summary:summarize(state) }); } catch(error){ return res.status(error.status||500).json({ success:false, message:error.message||'Failed to load onboarding state' }); }
});
router.put('/companies/:companyId/onboarding/step', async (req,res)=>{
 try{ await ensureCompanyOrThrow(req.params.companyId); const state=await CompanyOnboardingState.findOne({companyId:req.params.companyId}); if(!state) return res.status(404).json({ success:false, message:'Onboarding state not found' }); const stepKey=String(req.body?.stepKey||'').trim(); const currentStep=Number(req.body?.currentStep||state.currentStep||1); if(!STEP_KEYS.includes(stepKey)) return res.status(400).json({ success:false, message:'Invalid onboarding step' }); state.steps = { ...(state.steps||{}), [stepKey]: true }; state.currentStep = currentStep; await state.save(); return res.json({ success:true, onboarding:state, summary:summarize(state) }); } catch(error){ return res.status(error.status||500).json({ success:false, message:error.message||'Failed to update onboarding step' }); }
});
router.post('/companies/:companyId/onboarding/complete', async (req,res)=>{
 try{ const company=await Company.findById(req.params.companyId); if(!company) return res.status(404).json({ success:false, message:'Company not found' }); const state=await CompanyOnboardingState.findOne({companyId:req.params.companyId}); if(!state) return res.status(404).json({ success:false, message:'Onboarding state not found' }); const required=["companyCreated","settingsConfigured","hierarchyAssigned","rolesAssigned","dashboardsGenerated","modulesAssigned","permissionsConfigured","documentTemplatesConfigured"]; const missing=required.filter(k=>!state.steps?.[k]); if(missing.length) return res.status(400).json({ success:false, message:`Cannot complete onboarding. Missing: ${missing.join(', ')}` }); state.steps.setupCompleted=true; state.currentStep=9; state.completedBy=req.user?.uid||req.user?._id; state.completedAt=new Date(); await state.save(); company.onboardingStatus='completed'; company.setupCompletedAt=new Date(); await company.save(); return res.json({ success:true, onboarding:state, summary:summarize(state) }); } catch(error){ return res.status(error.status||500).json({ success:false, message:error.message||'Failed to complete onboarding' }); }
});
router.get('/companies/:companyId/onboarding-summary', async (req,res)=>{
 try{ await ensureCompanyOrThrow(req.params.companyId); const [settings,hierarchy,roles,dashboards,modules,permissions,documents,state] = await Promise.all([CompanySettings.findOne({companyId:req.params.companyId}).lean(), CompanyHierarchyConfig.findOne({companyId:req.params.companyId}).lean(), CompanyRoleConfig.find({companyId:req.params.companyId}).lean(), CompanyDashboardConfig.find({companyId:req.params.companyId}).lean(), CompanyRoleModuleConfig.find({companyId:req.params.companyId}).lean(), CompanyRoleModulePermission.find({companyId:req.params.companyId}).lean(), CompanyDocumentTemplate.find({companyId:req.params.companyId}).lean(), CompanyOnboardingState.findOne({companyId:req.params.companyId}).lean()]);
 return res.json({ success:true, settings, hierarchy, roles, dashboards, modules, permissions, documents, onboardingState:state, onboardingSummary:summarize(state) }); } catch(error){ return res.status(error.status||500).json({ success:false, message:error.message||'Failed to load onboarding summary' }); }
});
module.exports = router;
