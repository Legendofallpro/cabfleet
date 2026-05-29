"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { TextField } from "@/components/common/form/TextField";
import { FormActions } from "@/components/common/FormActions";
import {
  orgInputSchema,
  type OrgFormValues,
} from "@/modules/orgs/validators/org";
import {
  createOrgAction,
  updateOrgAction,
} from "@/modules/orgs/actions/org.actions";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<OrgFormValues> & { id?: string };
};

export function OrgForm({ mode, defaultValues }: Props) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrgFormValues>({
    resolver: zodResolver(orgInputSchema),
    defaultValues: {
      slug: defaultValues?.slug ?? "",
      name: defaultValues?.name ?? "",
    },
  });

  async function onSubmit(values: OrgFormValues) {
    const result =
      mode === "edit"
        ? await updateOrgAction({ ...values, id: defaultValues?.id ?? "" })
        : await createOrgAction(values);

    if (!result.ok) {
      if (result.error.fieldErrors) {
        for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
          setError(field as keyof OrgFormValues, { message: messages?.[0] });
        }
      }
      toast.error(result.error.message);
      return;
    }

    toast.success(mode === "edit" ? "Organization updated." : "Organization created.");
    router.push("/orgs");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          label="Slug"
          required
          placeholder="acme-cabs"
          {...register("slug")}
          error={errors.slug?.message}
          hint="Lowercase letters, digits and dashes. Used in URLs and JWT claims."
        />
        <TextField
          label="Name"
          required
          placeholder="Acme Cabs Pvt. Ltd."
          {...register("name")}
          error={errors.name?.message}
        />
      </div>
      <FormActions cancelHref="/orgs" submitting={isSubmitting} />
    </form>
  );
}
