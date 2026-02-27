import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../auth/useAuth';
import { getRoleMenu } from './RoleMenuConfig';
import { roleToMenuKey } from '../utils/roleRedirect';
import ModulePlaceholderScreen from '../screens/common/ModulePlaceholderScreen';
import SettingsScreen from '../screens/common/SettingsScreen';
import AdminShell from '../screens/roles/admin/AdminShell';
import WarehouseShell from '../screens/roles/warehouseManager/WarehouseShell';
import DistributorShell from '../screens/roles/distributor/DistributorShell';
import SalesmanShell from '../screens/roles/salesman/SalesmanShell';
import OrderBookerShell from '../screens/roles/orderBooker/OrderBookerShell';
import CustomerShell from '../screens/roles/customer/CustomerShell';
import CEOShell from '../screens/roles/ceo/CEOShell';
import ManagingDirectorShell from '../screens/roles/managingDirector/ManagingDirectorShell';
import AccountOfficerShell from '../screens/roles/accountOfficer/AccountOfficerShell';
import HRAssistantShell from '../screens/roles/hrAssistant/HRAssistantShell';
import CashierShell from '../screens/roles/cashier/CashierShell';
import KPOShell from '../screens/roles/kpo/KPOShell';
import BrandManagerShell from '../screens/roles/brandManager/BrandManagerShell';
import NationalSMShell from '../screens/roles/nationalSM/NationalSMShell';
import RegionalSMShell from '../screens/roles/regionalSM/RegionalSMShell';
import ZoneSMShell from '../screens/roles/zoneSM/ZoneSMShell';
import TerritorySMShell from '../screens/roles/territorySM/TerritorySMShell';
import FieldSMShell from '../screens/roles/fieldSM/FieldSMShell';
import DeliveryBoyShell from '../screens/roles/deliveryBoy/DeliveryBoyShell';

const Drawer = createDrawerNavigator();

const roleShellMap = {
  admin: AdminShell,
  ceo: CEOShell,
  managingDirector: ManagingDirectorShell,
  warehouseManager: WarehouseShell,
  distributor: DistributorShell,
  salesman: SalesmanShell,
  orderBooker: OrderBookerShell,
  customer: CustomerShell,
  accountOfficer: AccountOfficerShell,
  hrAssistant: HRAssistantShell,
  cashier: CashierShell,
  kpo: KPOShell,
  brandManager: BrandManagerShell,
  nationalSM: NationalSMShell,
  regionalSM: RegionalSMShell,
  zoneSM: ZoneSMShell,
  territorySM: TerritorySMShell,
  fieldSM: FieldSMShell,
  deliveryBoy: DeliveryBoyShell,
};

export default function AppDrawer() {
  const { role, user } = useAuth();
  const roleKey = roleToMenuKey(role);
  const modules = getRoleMenu(role);
  const ShellComponent = roleShellMap[roleKey] || AdminShell;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#18181b',
        drawerActiveTintColor: '#059669',
      }}
    >
      <Drawer.Screen
        name="DashboardHome"
        component={ShellComponent}
        options={{ title: `${user?.fullName || 'ERP'} • ${role || 'Dashboard'}` }}
      />
      {modules.map((moduleName) => (
        <Drawer.Screen
          key={moduleName}
          name={moduleName}
          component={ModulePlaceholderScreen}
          initialParams={{ moduleName }}
        />
      ))}
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
