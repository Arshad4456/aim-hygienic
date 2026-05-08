import { MOBILE_MODULE_DETAILS } from './mobileErpAccess';

export const MOBILE_MODULES = Object.entries(MOBILE_MODULE_DETAILS).map(([key, item]) => ({
  key,
  label: item.title,
  screen: item.screen,
  group: item.group,
}));

export default MOBILE_MODULES;
