import React from "react";
import { useTaskPageLogic } from "./TaskPage.logic";
import TaskPageUI from "./TaskPageUI";
import IndicatorComments from '../../components/IndicatorComments';

const TaskPage = () => {
  const logic = useTaskPageLogic();
  // Lấy indicatorId từ logic (query param)
  const { indicatorId } = logic;
  return (
    <>
      <TaskPageUI {...logic} />
      {/* Thêm khu vực comment cho indicator nếu có indicatorId */}
      {indicatorId && <IndicatorComments indicatorId={indicatorId} />}
    </>
  );
};

export default TaskPage;
