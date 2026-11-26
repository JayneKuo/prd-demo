'use client';
import { useParams } from 'next/navigation';
import { OmsAppointments } from '@/features/oms/appointments';
export default function Page() { const { id } = useParams<{ id:string }>(); return <OmsAppointments detailId={id} />; }
