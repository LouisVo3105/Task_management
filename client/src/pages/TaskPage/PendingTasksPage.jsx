import usePendingTasksPageLogic from './PendingTasksPage.logic';
import PendingTasksPageUI from './PendingTasksPageUI';

const PendingTasksPage = () => {
  const logic = usePendingTasksPageLogic();
  return <PendingTasksPageUI {...logic} />;
};

export default PendingTasksPage; 