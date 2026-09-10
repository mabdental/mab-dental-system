import { AdminShell, AdminWorkspace } from '@/components/admin'

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminShell><AdminWorkspace page="appointment-detail" recordId={(await params).id} /></AdminShell>
}
