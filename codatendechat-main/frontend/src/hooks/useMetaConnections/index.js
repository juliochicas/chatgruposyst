import { useState, useEffect, useReducer, useContext } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import { SocketContext } from "../../context/Socket/SocketContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_META_CONNECTIONS") {
    const metaConnections = action.payload;
    return [...metaConnections];
  }

  if (action.type === "UPDATE_META_CONNECTION") {
    const metaConnection = action.payload;
    const index = state.findIndex((s) => s.id === metaConnection.id);

    if (index !== -1) {
      state[index] = metaConnection;
      return [...state];
    } else {
      return [metaConnection, ...state];
    }
  }

  if (action.type === "DELETE_META_CONNECTION") {
    const metaConnectionId = action.payload;
    const index = state.findIndex((s) => s.id === metaConnectionId);
    if (index !== -1) {
      state.splice(index, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useMetaConnections = () => {
  const [metaConnections, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    setLoading(true);
    const fetchMetaConnections = async () => {
      try {
        const { data } = await api.get("/meta-connections/");
        dispatch({ type: "LOAD_META_CONNECTIONS", payload: data });
        setLoading(false);
      } catch (err) {
        setLoading(false);
        toastError(err);
      }
    };
    fetchMetaConnections();
  }, []);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-metaConnection`, (data) => {
      if (data.action === "update") {
        if (data.metaConnection) {
          dispatch({ type: "UPDATE_META_CONNECTION", payload: data.metaConnection });
        } else {
          // Full reload when no specific connection data
          api.get("/meta-connections/").then(({ data }) => {
            dispatch({ type: "LOAD_META_CONNECTIONS", payload: data });
          });
        }
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_META_CONNECTION", payload: data.metaConnectionId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  return { metaConnections, loading };
};

export default useMetaConnections;
