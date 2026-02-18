import { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";
import moment from "moment";
const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});

  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
        setIsAuth(true);
      }
      return config;
    },
    (error) => {
      Promise.reject(error);
    }
  );

  let isRefreshing = false;
  let failedRequestsQueue = [];

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Handle company expired/disabled errors – don't try token refresh
      const errorMsg = error?.response?.data?.error;
      if (
        error?.response?.status === 403 &&
        (errorMsg === "ERR_COMPANY_EXPIRED" || errorMsg === "ERR_COMPANY_DISABLED")
      ) {
        return Promise.reject(error);
      }

      if (error?.response?.status === 403 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedRequestsQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await api.post("/auth/refresh_token");

          if (data) {
            localStorage.setItem("token", JSON.stringify(data.token));
            api.defaults.headers.Authorization = `Bearer ${data.token}`;

            failedRequestsQueue.forEach((request) => {
              request.resolve(data.token);
            });
            failedRequestsQueue = [];
          }

          return api(originalRequest);
        } catch (refreshError) {
          failedRequestsQueue.forEach((request) => {
            request.reject(refreshError);
          });
          failedRequestsQueue = [];

          localStorage.removeItem("token");
          localStorage.removeItem("companyId");
          api.defaults.headers.Authorization = undefined;
          setIsAuth(false);

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (
        error?.response?.status === 401 ||
        (error?.response?.status === 403 && originalRequest._retry)
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("companyId");
        api.defaults.headers.Authorization = undefined;
        setIsAuth(false);
      }

      return Promise.reject(error);
    }
  );

  const socketManager = useContext(SocketContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          setIsAuth(true);
          setUser(data.user);
        } catch (err) {
          // Session expired is expected when returning with stale token.
          // Silently clean up instead of showing an error toast.
          const errorMsg = err?.response?.data?.error;
          if (
            errorMsg === "ERR_SESSION_EXPIRED" ||
            err?.response?.status === 401
          ) {
            localStorage.removeItem("token");
            localStorage.removeItem("companyId");
            localStorage.removeItem("userId");
            api.defaults.headers.Authorization = undefined;
          } else {
            toastError(err);
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (companyId) {
      const socket = socketManager.getSocket(companyId);

      socket.on(`company-${companyId}-user`, (data) => {
        if (data.action === "update" && data.user.id === user.id) {
          setUser(data.user);
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [socketManager, user]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      const {
        user: { companyId, id, company },
      } = data;

      if (has(company, "settings") && isArray(company.settings)) {
        const setting = company.settings.find(
          (s) => s.key === "campaignsEnabled"
        );
        if (setting && setting.value === "true") {
          localStorage.setItem(`cshow_${companyId}`, null); //regla para mostrar campañas
        }
      }

      moment.locale("es");
      const dueDate = data.user.company?.dueDate || data.user.company?.due_date;

      // If no dueDate found, allow login (don't block on missing subscription data)
      if (!dueDate) {
        localStorage.setItem("token", JSON.stringify(data.token));
        localStorage.setItem("companyId", companyId);
        localStorage.setItem("userId", id);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));
        history.push("/tickets");
        setLoading(false);
        return;
      }

      const hoje = moment(moment()).format("DD/MM/yyyy");
      const vencimiento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(dueDate).diff(moment(moment()).format());

      var before = moment(moment().format()).isBefore(dueDate);
      var dias = moment.duration(diff).asDays();

      if (before === true) {
        localStorage.setItem("token", JSON.stringify(data.token));
        localStorage.setItem("companyId", companyId);
        localStorage.setItem("userId", id);
        localStorage.setItem("companyDueDate", vencimiento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));
        if (Math.round(dias) < 5) {
          toast.warn(
            `Tu suscripción vence en ${Math.round(dias)} ${Math.round(dias) === 1 ? "día" : "días"
            } `
          );
        }
        history.push("/tickets");
        setLoading(false);
      } else {
        toastError(`¡Tu suscripción venció el ${vencimiento}!\nContacta con Soporte para más información.`);
        setLoading(false);
      }

      //salto de línea
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      await api.delete("/auth/logout");
      setIsAuth(false);
      setUser({});
      const logoutCompanyId = localStorage.getItem("companyId");
      localStorage.removeItem("token");
      localStorage.removeItem("companyId");
      localStorage.removeItem("userId");
      if (logoutCompanyId) {
        localStorage.removeItem(`cshow_${logoutCompanyId}`);
      }
      api.defaults.headers.Authorization = undefined;
      setLoading(false);
      history.push("/login");
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      return data;
    } catch (err) {
      toastError(err);
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
  };
};

export default useAuth;
