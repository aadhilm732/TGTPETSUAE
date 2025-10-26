'use client'
import { PackageIcon, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useUser, useClerk, UserButton, Protect } from "@clerk/nextjs";

const Navbar = () => {
    const { user } = useUser();
    const { openSignIn } = useClerk();
    const router = useRouter();

    const [search, setSearch] = useState('');
    const cartCount = useSelector(state => state.cart.total);

    const handleSearch = (e) => {
        e.preventDefault();
        router.push(`/shop?search=${search}`);
    }

    return (
        <>
            <nav className="relative bg-white">
                <div className="mx-6">
                    <div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">

                        <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                            <span className="text-green-600">TGTPETS</span>
                            <span
                                className="relative font-bold bg-[linear-gradient(90deg,#00732F,#000000,#FF0000,#00732F)] bg-[length:300%_300%] text-transparent bg-clip-text animate-flagWave inline-block"
                            >
                                UAE
                            </span>
                            <span className="text-green-600 text-5xl leading-0">.</span>

                            <Protect plan='plus'>
                                <p className="absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500">
                                    plus
                                </p>
                            </Protect>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                            <Link href="/">Home</Link>
                            <Link href="/shop">Shop</Link>
                            <Link href="/">About</Link>
                            <Link href="/">Contact</Link>

                            <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                                <Search size={18} className="text-slate-600" />
                                <input
                                    className="w-full bg-transparent outline-none placeholder-slate-600"
                                    type="text"
                                    placeholder="Search products"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    required
                                />
                            </form>

                            <Link href="/cart" className="relative flex items-center gap-2 text-slate-600">
                                <ShoppingCart size={18} />
                                Cart
                                <button className="absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full">
                                    {cartCount}
                                </button>
                            </Link>

                            {!user ? (
                                <button onClick={openSignIn} className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full">
                                    Login
                                </button>
                            ) : (
                                <UserButton>
                                    <UserButton.MenuItems>
                                        <UserButton.Action labelIcon={<PackageIcon size={16} />} label="My orders" onClick={() => router.push('/orders')} />
                                    </UserButton.MenuItems>
                                </UserButton>
                            )}
                        </div>

                        {/* Mobile User Button */}
                        <div onClick={openSignIn} className="sm:hidden">
                            {user ? (
                                <div>
                                    <UserButton>
                                        <UserButton.MenuItems>
                                            <UserButton.Action labelIcon={<ShoppingCart size={16} />} label="Cart" onClick={() => router.push('/cart')} />
                                        </UserButton.MenuItems>
                                    </UserButton>

                                    <UserButton>
                                        <UserButton.MenuItems>
                                            <UserButton.Action labelIcon={<PackageIcon size={16} />} label="My orders" onClick={() => router.push('/orders')} />
                                        </UserButton.MenuItems>
                                    </UserButton>
                                </div>
                            ) : (
                                <button className="px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full">
                                    Login
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <hr className="border-gray-300" />
            </nav>

            {/* Moving Flag Animation */}
            <style jsx>{`
                /* 🇦🇪 Moving gradient for flag colors */
                @keyframes flagGradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                /* 🟩⬛🟥 Gentle up-and-down wave motion */
                @keyframes flagShake {
                    0%, 100% { transform: translateY(0); }
                    25% { transform: translateY(-2px); }
                    75% { transform: translateY(2px); }
                }

                .animate-flagWave {
                    animation: flagGradient 4s ease-in-out infinite, flagShake 1s ease-in-out infinite;
                    display: inline-block;
                    background-clip: text;
                    -webkit-background-clip: text;
                    color: transparent;
                }
            `}</style>
        </>
    )
}

export default Navbar;
