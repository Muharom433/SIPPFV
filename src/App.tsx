import { AuthProvider, AppProvider } from './contexts/AuthContext';
import { SippApp } from './SippApp';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <SippApp />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
