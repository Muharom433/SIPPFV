import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
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
