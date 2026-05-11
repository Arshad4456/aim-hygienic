import { MOBILE_MODULE_DETAILS } from './mobileErpAccess';

export const MOBILE_MODULES = Object.entries(MOBILE_MODULE_DETAILS).map(([key, item]) => ({
  key,
  name: item.title,
  group: item.group,
  screen: item.screen,
}));

export default MOBILE_MODULES;
