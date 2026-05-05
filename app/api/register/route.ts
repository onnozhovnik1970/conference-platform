import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RegisterPayload = {
  lastName: string;
  firstName: string;
  middleName?: string;
  institution: string;
  faculty: string;
  specialty: string;
  yearOfStudy: string;
  group: string;
  country: string;
  email: string;
  phone: string;
  abstractTitle: string;
  abstractLanguage: string;
  thematicPanel: string;
  supervisorName: string;
  supervisorTitleDegree?: string;
  supervisorPosition?: string;
  hasPresentation: "yes" | "no";
};

const REQUIRED_FIELDS: Array<keyof RegisterPayload> = [
  "lastName",
  "firstName",
  "institution",
  "faculty",
  "specialty",
  "yearOfStudy",
  "group",
  "country",
  "email",
  "phone",
  "abstractTitle",
  "abstractLanguage",
  "thematicPanel",
  "supervisorName",
  "hasPresentation"
];

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function validate(payload: RegisterPayload): string[] {
  const missing = REQUIRED_FIELDS.filter((field) => isBlank(payload[field]));
  const errors: string[] = [];

  if (missing.length > 0) {
    errors.push(`Missing required fields: ${missing.join(", ")}`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.email)) {
    errors.push("Invalid email format");
  }

  const phoneRegex = /^[+]?[\d\s\-()]{8,20}$/;
  if (!phoneRegex.test(payload.phone)) {
    errors.push("Invalid phone format");
  }

  if (!["yes", "no"].includes(payload.hasPresentation)) {
    errors.push("Invalid hasPresentation value");
  }

  return errors;
}

function normalizeSupabaseUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterPayload>;
    const payload: RegisterPayload = {
      lastName: body.lastName ?? "",
      firstName: body.firstName ?? "",
      middleName: body.middleName ?? "",
      institution: body.institution ?? "",
      faculty: body.faculty ?? "",
      specialty: body.specialty ?? "",
      yearOfStudy: body.yearOfStudy ?? "",
      group: body.group ?? "",
      country: body.country ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      abstractTitle: body.abstractTitle ?? "",
      abstractLanguage: body.abstractLanguage ?? "",
      thematicPanel: body.thematicPanel ?? "",
      supervisorName: body.supervisorName ?? "",
      supervisorTitleDegree: body.supervisorTitleDegree ?? "",
      supervisorPosition: body.supervisorPosition ?? "",
      hasPresentation: (body.hasPresentation ?? "") as RegisterPayload["hasPresentation"]
    };

    const validationErrors = validate(payload);
    if (validationErrors.length > 0) {
      return NextResponse.json({ success: false, error: validationErrors.join("; ") }, { status: 400 });
    }

    const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = supabaseUrlRaw ? normalizeSupabaseUrl(supabaseUrlRaw) : null;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ success: false, error: "Supabase server credentials are not configured." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error } = await supabase.from("participants").insert({
      last_name: payload.lastName.trim(),
      first_name: payload.firstName.trim(),
      middle_name: payload.middleName?.trim() || null,
      institution: payload.institution.trim(),
      faculty: payload.faculty.trim(),
      specialty: payload.specialty.trim(),
      study_year: payload.yearOfStudy.trim(),
      study_group: payload.group.trim(),
      country: payload.country.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      abstract_title: payload.abstractTitle.trim(),
      abstract_language: payload.abstractLanguage.trim(),
      thematic_panel: payload.thematicPanel.trim(),
      supervisor_name: payload.supervisorName.trim(),
      supervisor_title: payload.supervisorTitleDegree?.trim() || null,
      supervisor_position: payload.supervisorPosition?.trim() || null,
      has_presentation: payload.hasPresentation === "yes"
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "Email already registered.", code: "EMAIL_EXISTS" }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
}
