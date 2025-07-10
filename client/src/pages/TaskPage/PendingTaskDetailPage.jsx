import usePendingTaskDetailPageLogic from './PendingTaskDetailPage.logic';
import PendingTaskDetailPageUI from './PendingTaskDetailPageUI';

const PendingTaskDetailPage = () => {
  const logic = usePendingTaskDetailPageLogic();
  return <PendingTaskDetailPageUI {...logic} />;
};

export default PendingTaskDetailPage; 