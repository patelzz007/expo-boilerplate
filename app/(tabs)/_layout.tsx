import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { SideMenu } from "@/components/SideMenu";
import { MenuProvider, useMenu } from "@/components/MenuContext";

function TabsLayout() {
  const { menuVisible, closeMenu } = useMenu();

  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
          }}
        />
        <Tabs.Screen
          name="details"
          options={{
            title: "Details",
            tabBarLabel: "Details",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarLabel: "Settings",
          }}
        />
      </Tabs>
      <SideMenu visible={menuVisible} onClose={closeMenu} />
    </>
  );
}

export default function Layout() {
  return (
    <MenuProvider>
      <TabsLayout />
    </MenuProvider>
  );
}
