import { AlertProvider } from "./components/common/Alert";
import AppRoutes from "./routes/AppRoutes";
import "./styles/global.css";

function App() {
  return (
    <AlertProvider>
      <AppRoutes />
    </AlertProvider>
  );
}

export default App;