import React, { useEffect, useContext } from 'react';
import { useHistory } from "react-router-dom";
import { SuccessContent, Total } from './style';
import { FaCheckCircle } from 'react-icons/fa';
import { SocketContext } from "../../../context/Socket/SocketContext";
import { useDate } from "../../../hooks/useDate";
import { toast } from "react-toastify";
import { i18n } from "../../../translate/i18n";

function CheckoutSuccess() {
  const history = useHistory();
  const { dateToClient } = useDate();
  const socketManager = useContext(SocketContext);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-payment`, (data) => {
      if (data.action === "CONCLUIDA") {
        toast.success(`${i18n.t("subscription.remainingTest")} ${dateToClient(data.company.dueDate)}!`);
        setTimeout(() => {
          history.push("/");
        }, 4000);
      }
    });
  }, [history, socketManager, dateToClient]);

  return (
    <React.Fragment>
      <Total>
        <span>
          <FaCheckCircle size={24} color="#4caf50" />
        </span>
      </Total>
      <SuccessContent>
        <h3>{i18n.t("checkoutPage.stripeRedirect")}</h3>
        <p>{i18n.t("checkoutPage.stripeRedirectDesc")}</p>
      </SuccessContent>
    </React.Fragment>
  );
}

export default CheckoutSuccess;
