import React from 'react';

export default function AboutUs() {
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm p-8 md:p-12 border border-gray-100">
                <h1 className="text-4xl font-black text-gray-900 mb-8 uppercase tracking-tight text-center">
                    About Us
                </h1>
                
                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to D2F Web3 Ticketing</h2>
                        <p>
                            D2F is a cutting-edge Web3 ticketing platform developed by students of the Computer Science department at the University of Transport and Communications (UTC). Our mission is to revolutionize the event ticketing industry by leveraging the power of blockchain technology to ensure security, transparency, and fairness for both organizers and attendees.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Vision</h2>
                        <p>
                            We envision a world where every ticket is a secure digital asset (NFT) that cannot be forged or manipulated. By using the Oasis Sapphire network, we provide confidential smart contract capabilities that protect user data while ensuring all transactions are verifiable on-chain.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Why Choose D2F?</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Immutable Ownership:</strong> Tickets are NFTs stored on the blockchain, guaranteeing authentic ownership.</li>
                            <li><strong>Anti-Scalping:</strong> Smart contracts can regulate resale prices to prevent unfair price gouging.</li>
                            <li><strong>Transparency:</strong> All transactions and event details are recorded on the public ledger.</li>
                            <li><strong>Confidentiality:</strong> Powered by Oasis Sapphire, we keep sensitive information private while maintaining blockchain integrity.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">The Team</h2>
                        <p>
                            Born as a research project at the University of Transport and Communications, our team consists of passionate developers and blockchain enthusiasts dedicated to pushing the boundaries of decentralized applications (dApps) in Vietnam and beyond.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                    <p className="text-gray-400 text-sm">
                        © 2026 D2F Web3 Ticketing - University of Transport and Communications (UTC)
                    </p>
                </div>
            </div>
        </div>
    );
}
