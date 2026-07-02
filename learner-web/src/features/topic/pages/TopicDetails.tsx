import { Navigate, useParams } from "react-router-dom";

export default function TopicDetailsRedirect() {
  const { slug } = useParams();
  return <Navigate replace to={`/topics?topic=${encodeURIComponent(slug || "")}`} />;
}
