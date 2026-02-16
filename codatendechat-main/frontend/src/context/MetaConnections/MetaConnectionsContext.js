import React, { createContext } from "react";
import useMetaConnections from "../../hooks/useMetaConnections";

const MetaConnectionsContext = createContext();

const MetaConnectionsProvider = ({ children }) => {
  const { loading, metaConnections } = useMetaConnections();

  return (
    <MetaConnectionsContext.Provider value={{ metaConnections, loading }}>
      {children}
    </MetaConnectionsContext.Provider>
  );
};

export { MetaConnectionsContext, MetaConnectionsProvider };
