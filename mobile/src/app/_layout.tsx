import { Drawer } from 'expo-router/drawer';

import { OudDataProvider } from '@/context/oud-data-context';

export default function RootLayout() {
  return (
    <OudDataProvider>
      <Drawer>
        <Drawer.Screen
          name="index"
          options={{
            title: 'OUD2ファイル',
            drawerLabel: 'OUD2ファイル閲覧',
          }}
        />
        <Drawer.Screen
          name="station-timetable"
          options={{
            title: '駅時刻表',
            drawerLabel: '駅時刻表',
          }}
        />
        <Drawer.Screen
          name="station-list"
          options={{
            title: '駅一覧',
            drawerLabel: '駅一覧',
          }}
        />
        <Drawer.Screen
          name="train-preview"
          options={{
            title: '列車プレビュー',
            drawerLabel: '列車プレビュー',
          }}
        />
      </Drawer>
    </OudDataProvider>
  );
}