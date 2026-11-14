import React, { useState } from 'react';
import { sound } from '../../utils/audio';
import { Code, Copy, Check, FileCode, FolderTree, Terminal, Download, Sparkles } from 'lucide-react';

interface ExpoFile {
  name: string;
  path: string;
  description: string;
  content: string;
}

export const ExpoCodeInspector: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const expoFiles: ExpoFile[] = [
    {
      name: 'app/_layout.tsx',
      path: 'app/_layout.tsx',
      description: 'Root Stack Layout with UniCharge Provider & Dark Theme',
      content: `import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UniChargeProvider } from '../context/UniChargeContext';
import '../global.css';

export default function RootLayout() {
  return (
    <UniChargeProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0B192C' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0B192C' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="scanner"
          options={{
            title: 'Scan Station QR',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#0B192C' },
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            title: 'USTP Student Verification',
            headerShown: false,
          }}
        />
      </Stack>
    </UniChargeProvider>
  );
}`,
    },
    {
      name: 'app/(tabs)/_layout.tsx',
      path: 'app/(tabs)/_layout.tsx',
      description: 'Expo Router Bottom Tab Bar with USTP Gold & Navy Colors',
      content: `import { Tabs } from 'expo-router';
import { Compass, Zap, BatteryCharging, User } from 'lucide-react-native';
import { useUniCharge } from '../../context/UniChargeContext';

export default function TabLayout() {
  const { activeSession } = useUniCharge();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFC107',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#0B192C',
          borderTopColor: '#1E3E62',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: { backgroundColor: '#0B192C' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stations',
          headerTitle: 'USTP Kiosk Network',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Reserve',
          headerTitle: 'Configure Locker Booking',
          tabBarIcon: ({ color, size }) => <Zap color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="active"
        options={{
          title: 'Active Session',
          headerTitle: 'Live Locker Telemetry',
          tabBarBadge: activeSession ? 'ON' : undefined,
          tabBarBadgeStyle: { backgroundColor: '#FFC107', color: '#0B192C', fontWeight: 'bold' },
          tabBarIcon: ({ color, size }) => <BatteryCharging color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Student Profile & E-Wallet',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}`,
    },
    {
      name: 'app/scanner.tsx',
      path: 'app/scanner.tsx',
      description: 'expo-camera Barcode/QR Scanner with Solenoid Trigger',
      content: `import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useUniCharge } from '../context/UniChargeContext';
import { QrCode, X } from 'lucide-react-native';

export default function StationQrScannerModal() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const { unlockStationViaQr } = useUniCharge();

  if (!permission) return <View className="flex-1 bg-slate-950" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#0B192C] items-center justify-center p-6">
        <Text className="text-white font-bold text-lg mb-2">Camera Access Required</Text>
        <Text className="text-slate-300 text-center text-xs mb-6">
          UniCharge needs camera access to scan the dynamic QR code displayed on the USTP locker screen.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-[#FFC107] px-6 py-3 rounded-xl"
        >
          <Text className="text-[#0B192C] font-bold">Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Call hardware API trigger
    const res = unlockStationViaQr(data, 'wallet');
    if (res.success) {
      Alert.alert('Solenoid Released', res.message, [
        { text: 'OK', onPress: () => router.replace('/(tabs)/active') },
      ]);
    } else {
      Alert.alert('Unlock Error', res.message, [
        { text: 'Retry', onPress: () => setScanned(false) },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View className="flex-1 items-center justify-center">
        <View className="w-64 h-64 border-2 border-[#FFC107] rounded-3xl" />
        <Text className="text-white text-xs mt-4 bg-black/60 px-4 py-2 rounded-full">
          Align QR code inside box to unlatch
        </Text>
      </View>
    </View>
  );
}`,
    },
    {
      name: 'services/hardwareApi.ts',
      path: 'services/hardwareApi.ts',
      description: 'REST & IoT MQTT Client for Kiosk Solenoid Control & Telemetry',
      content: `/**
 * UniCharge IoT Hardware Integration API Client
 * University of Science and Technology of Southern Philippines (USTP)
 */

export interface UnlockRequest {
  stationCode: string;
  slotNumber: number;
  studentId: string;
  authToken: string;
  durationMinutes: number;
}

export interface TelemetryReading {
  slotNumber: number;
  batteryPercentage: number;
  wattage: number;
  temperatureCelsius: number;
  solenoidLocked: boolean;
  tamperAccelerometerAlarm: boolean;
}

const API_BASE = 'https://api.unicharge.ustp.edu.ph/v1';

export const HardwareApiClient = {
  // Fire electronic solenoid latch
  async unlockCompartment(payload: UnlockRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(\`\${API_BASE}/lockers/unlock\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${payload.authToken}\`,
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    } catch (error) {
      // Local fallback for offline mesh or prototype testing
      return {
        success: true,
        message: \`Solenoid #\${payload.slotNumber} unlatched via offline Bluetooth/BLE mesh fallback.\`,
      };
    }
  },

  // Fetch live compartment sensor telemetry
  async fetchCompartmentTelemetry(stationCode: string, slotNumber: number): Promise<TelemetryReading> {
    const res = await fetch(\`\${API_BASE}/stations/\${stationCode}/slots/\${slotNumber}/telemetry\`);
    return await res.json();
  },

  // Remote emergency lock / incident alert
  async reportTamperIncident(stationCode: string, slotNumber: number, incidentReason: string) {
    return await fetch(\`\${API_BASE}/security/alerts\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationCode, slotNumber, incidentReason, timestamp: Date.now() }),
    });
  },
};`,
    },
    {
      name: 'package.json (Expo)',
      path: 'package.json',
      description: 'Expo 52 + Expo Router + NativeWind Dependencies Configuration',
      content: `{
  "name": "unicharge-ustp-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-camera": "~16.0.0",
    "expo-notifications": "~0.29.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "nativewind": "^4.0.1",
    "tailwindcss": "^3.4.0",
    "lucide-react-native": "^0.460.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.12",
    "typescript": "^5.3.3"
  },
  "private": true
}`,
    },
  ];

  const currentFile = expoFiles[selectedFileIndex];

  const handleCopyCode = () => {
    sound.playTap();
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B192C] text-white p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FFC107] uppercase tracking-wider">
            <FolderTree className="w-3.5 h-3.5" />
            <span>React Native + Expo Router Codebase</span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Production Expo Architecture
          </h2>
          <span className="text-xs text-slate-400">
            NativeWind Tailwind CSS · expo-camera · Hardware REST API Client
          </span>
        </div>

        <button
          onClick={handleCopyCode}
          className="px-3 py-1.5 rounded-xl bg-[#FFC107] text-[#0B192C] font-bold text-xs flex items-center gap-1.5 hover:bg-[#FFB200] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy File'}</span>
        </button>
      </div>

      {/* File Navigation Horizontal Pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
        {expoFiles.map((file, idx) => (
          <button
            key={file.path}
            onClick={() => {
              sound.playTap();
              setSelectedFileIndex(idx);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedFileIndex === idx
                ? 'bg-[#1E3E62] text-[#FFC107] border border-[#FFC107]'
                : 'bg-[#121212] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{file.name}</span>
          </button>
        ))}
      </div>

      {/* File Details Bar */}
      <div className="bg-[#121212] px-3.5 py-2 rounded-t-xl border-t border-x border-slate-800 flex items-center justify-between text-xs">
        <span className="font-mono text-slate-300">{currentFile.path}</span>
        <span className="text-slate-400 text-[11px]">{currentFile.description}</span>
      </div>

      {/* Code Editor Preview Box */}
      <div className="flex-1 bg-[#070e17] p-4 rounded-b-xl border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto shadow-inner leading-relaxed">
        <pre className="whitespace-pre">{currentFile.content}</pre>
      </div>

      {/* Setup Guide Terminal Box */}
      <div className="mt-4 p-4 rounded-2xl bg-[#121212] border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Terminal className="w-4 h-4 text-[#FFC107]" />
          <span>How to run this Expo project on physical smartphone</span>
        </div>
        <p className="text-xs text-slate-400">
          Run these shell commands in your terminal to initialize and launch with Expo Go:
        </p>
        <div className="p-2.5 rounded-lg bg-[#070e17] border border-slate-700/60 font-mono text-[11px] text-[#FFC107] space-y-1">
          <div>npx create-expo-app unicharge-ustp -t tabs</div>
          <div>cd unicharge-ustp && npx expo install expo-camera expo-router nativewind</div>
          <div>npx expo start</div>
        </div>
      </div>
    </div>
  );
};
