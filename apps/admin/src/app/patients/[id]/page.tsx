import { AdminShell, AdminWorkspace } from '@/components/admin'

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminShell><AdminWorkspace page="patient-detail" recordId={(await params).id} /></AdminShell>
}
