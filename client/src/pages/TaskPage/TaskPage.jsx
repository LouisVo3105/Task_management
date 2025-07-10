import React from "react";
import { useTaskPageLogic } from "./TaskPage.logic";
import TaskPageUI from "./TaskPageUI";

const TaskPage = () => {
  const logic = useTaskPageLogic();
  return <TaskPageUI {...logic} />;
};

export default TaskPage;
