import { redirect } from "next/navigation";

export default async function SubmitEventRedirect(props) {
  const params = await props.params;
  redirect(`/${params.locale}/services/submit-event`);
}
