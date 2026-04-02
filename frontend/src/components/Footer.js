export default function Footer() {
    return (
        <footer className="bg-gray-950 text-neutral-content flex flex-col">
            {/* Main Content Section */}
            <section className="max-w-[1440px] w-full mx-auto mt-12 mb-6 md:mt-16 md:mb-12">
                <div className="flex flex-col md:flex-row space-y-10 space-x-0 md:space-x-16 md:space-y-0 px-4 md:px-10 mx-auto">
                    
                    {/* Logo & Tagline */}
                    <div className="flex flex-col flex-grow space-y-4 md:max-w-[25%]">
                        <div className="flex flex-row">
                            <div>
                                <div className="w-28 h-28 bg-transparent rounded flex items-center justify-center">
                                    <img src="/logoUTC.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <p className="text-bs mt-4 leading-6 text-white">
                                    Trường Đại Học Giao Thông Vận Tải - Cơ sở Hà Nội
                                </p>
                                <p className="text-xs text-[#98a2b3] mt-2">
                                    UNIVERSITY OF TRANSPORT AND COMMUNICATIONS
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Link Columns */}
                    <div className="flex flex-col flex-grow md:flex-row space-x-0 md:space-x-8 space-y-10 md:space-y-0">
                        
                        {/* Column 1 */}
                        <div className="flex flex-col flex-grow space-y-4">
                            <div className="font-semibold text-sm text-[#98a2b3]">SECTION ONE</div>
                            <div className="flex flex-col space-y-3">
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 1</button>
                                </div>
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 2</button>
                                </div>
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 3</button>
                                </div>
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 4</button>
                                </div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col flex-grow space-y-4">
                            <div className="font-semibold text-sm text-[#98a2b3]">SECTION TWO</div>
                            <div className="flex flex-col space-y-3">
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 1</button>
                                </div>
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 2</button>
                                </div>
                            </div>
                        </div>

                        {/* Column 3 */}
                        <div className="flex flex-col flex-grow space-y-4">
                            <div className="font-semibold text-sm text-[#98a2b3]">SECTION THREE</div>
                            <div className="flex flex-col space-y-3">
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 1</button>
                                </div>
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 2</button>
                                </div>
                                <div className="font-semibold text-base text-white">
                                    <button className="hover:text-yellow-400 bg-none border-none cursor-pointer p-0 font-semibold">Link 3</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Company Info Section */}
            <section className="max-w-[1440px] w-full mx-auto my-6 md:my-12">
                <div className="flex flex-col md:flex-row px-4 md:px-10 space-y-2 md:space-y-0 space-x-0 md:space-x-8 mx-auto">
                    <div className="flex flex-col flex-grow">
                        <div className="font-semibold text-xl my-2 text-[#EAECF0]"> Khoa học máy tính - UTC</div>
                        <div className="flex flex-col space-y-0.5">
                            <div className="text-xs text-[#EAECF0]">Legal representative: [Guess]</div>
                            <div className="text-xs text-[#EAECF0]">Address: [3 Cầu Giấy, Ngọc Khánh, Láng, Hà Nội]</div>
                            <div className="text-xs text-[#EAECF0]">Business Registration Number: [11111111]</div>
                            <div className="text-xs text-[#EAECF0]">Hotline: [2222222222]</div>
                            <div className="text-xs text-[#EAECF0]">Email: <a href="mailto:neverwintop@gmail.com">neverwintop@gmail.com</a></div>
                        </div>
                    </div>
                </div>
            </section>

        </footer>
    );
}
