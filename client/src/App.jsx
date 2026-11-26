import { AlertProvider } from "./components/common/Alert";
import CommandPalette from "./components/common/CommandPalette";
import OfflineIndicator from "./components/pwa/OfflineIndicator";
import AppRoutes from "./routes/AppRoutes";
import Global3DCanvas from "./components/3d/Global3DCanvas";
import "./styles/global.css";

function App() {
  return (
    <AlertProvider>
      <Global3DCanvas />
      <AppRoutes />
      <CommandPalette />
      <OfflineIndicator />
    </AlertProvider>
  );
}

export default App;