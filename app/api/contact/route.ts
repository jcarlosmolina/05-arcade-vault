import { Resend } from "resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json(
      { error: "Nombre, correo y mensaje son obligatorios." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email.trim())) {
    return Response.json(
      { error: "El correo electrónico no tiene un formato válido." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: process.env.CONTACT_TO_EMAIL as string,
    replyTo: email.trim(),
    subject: `Nuevo mensaje de contacto de ${name.trim()}`,
    text: `Nombre: ${name.trim()}\nCorreo: ${email.trim()}\n\nMensaje:\n${message.trim()}`,
  });

  if (error) {
    return Response.json(
      { error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
