import useTaskDetailPageLogic from './TaskDetailPage.logic';
import TaskDetailPageUI from './TaskDetailPageUI';

const TaskDetailPage = () => {
  const logic = useTaskDetailPageLogic();
  return <TaskDetailPageUI {...logic} />;
};

export default TaskDetailPage; 