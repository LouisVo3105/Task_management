import React from "react";
import { useIndicatorPageLogic } from "./IndicatorPage.logic";
import IndicatorPageUI from "./IndicatorPageUI";

const IndicatorPage = () => {
  const logic = useIndicatorPageLogic();
  return <IndicatorPageUI {...logic} />;
};

export default IndicatorPage;