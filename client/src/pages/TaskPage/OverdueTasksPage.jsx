import useOverdueTasksPageLogic from "./OverdueTasksPage.logic";
import OverdueTasksPageUI from "./OverdueTasksPageUI";

export default function OverdueTasksPage() {
  const logic = useOverdueTasksPageLogic();
  return <OverdueTasksPageUI {...logic} />;
} 