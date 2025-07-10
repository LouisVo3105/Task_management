import useSubmitMainTaskPageLogic from './SubmitMainTaskPage.logic';
import SubmitMainTaskPageUI from './SubmitMainTaskPageUI';

const SubmitMainTaskPage = () => {
  const logic = useSubmitMainTaskPageLogic();
  return <SubmitMainTaskPageUI {...logic} />;
};

export default SubmitMainTaskPage; 