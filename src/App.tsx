import { AppRoutes } from "./routes";
import { ConnectGate } from "./ui/ConnectGate";

export function App() {
  return (
    <ConnectGate>
      <AppRoutes />
    </ConnectGate>
  );
}
