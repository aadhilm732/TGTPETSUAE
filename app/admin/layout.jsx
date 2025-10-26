import AdminLayout from "@/components/admin/AdminLayout";
import { SignedIn, SignedOut, SignIn } from "@clerk/nextjs";

export const metadata = {
    title: "TGTPETS. - Admin",
    description: "TGTPETS. - Admin",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
        <SignedIn>
            <AdminLayout>
                {children}
            </AdminLayout>
        </SignedIn>

        <SignedOut>
            <div className="min-h-screen flex items-center justify-center">
                <SignIn fallbackRedirectUrl="/admin"/>
            </div>
        </SignedOut>
        </>
    );
}
