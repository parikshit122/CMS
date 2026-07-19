import { AlertProvider } from "./components/common/Alert";
import AppRoutes from "./routes/AppRoutes";
import Global3DCanvas from "./components/3d/Global3DCanvas";
import "./styles/global.css";

function App() {
  return (
    <AlertProvider>
      <Global3DCanvas />
      <AppRoutes />
    </AlertProvider>
  );
}

export default App;