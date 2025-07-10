import React from "react";
import { useHomePageLogic } from "./HomePage.logic";
import HomePageUI from "./HomePageUI";

export default function HomePage() {
  const logic = useHomePageLogic();
  return <HomePageUI {...logic} />;
}
