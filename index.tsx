import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// fix: Import HttpLink to properly configure the Apollo Client link.
// fix: Import ApolloProvider from '@apollo/client/react' to resolve module export issue.
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';

// IMPORTANT: Replace this with your actual Data Connect endpoint URL
// You can find this URL in the Firebase console under Build > Data Connect,
// or in the output of the `firebase deploy` command.
const client = new ApolloClient({
  // fix: The 'uri' property is not a valid top-level option here; use 'link' with HttpLink.
  link: new HttpLink({ uri: 'YOUR_DATA_CONNECT_ENDPOINT_URL_HERE' }),
  cache: new InMemoryCache(),
  // In a production app, you would add authentication headers here.
});

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </React.StrictMode>
  );
});