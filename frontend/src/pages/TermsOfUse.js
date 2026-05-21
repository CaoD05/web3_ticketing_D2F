import React from 'react';

export default function TermsOfUse() {
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm p-8 md:p-12 border border-gray-100">
                <h1 className="text-4xl font-black text-gray-900 mb-8 uppercase tracking-tight text-center">
                    Terms of Use
                </h1>
                
                <div className="space-y-8 text-gray-700 leading-relaxed text-sm">
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-wide">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using the D2F Web3 Ticketing platform, you agree to comply with and be bound by these Terms of Use. If you do not agree, please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-wide">2. Blockchain Transactions</h2>
                        <p>
                            D2F is a decentralized application. All ticket purchases, check-ins, and resales are executed through smart contracts on the Oasis Sapphire network. You acknowledge that blockchain transactions are irreversible and that you are responsible for any gas fees incurred.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-wide">3. Ticket Ownership & Resale</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Each ticket is a unique NFT (Non-Fungible Token).</li>
                            <li>Owners may list their tickets for resale only through the official D2F secondary market.</li>
                            <li>The platform may enforce a maximum resale price to prevent scalping.</li>
                            <li>D2F is not responsible for any losses incurred during peer-to-peer resales.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-wide">4. User Responsibilities</h2>
                        <p>
                            You are responsible for the security of your MetaMask wallet and private keys. D2F cannot recover lost funds or stolen tickets resulting from compromised wallets. You agree not to use the platform for any illegal activities or to exploit smart contract vulnerabilities.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-wide">5. Limitation of Liability</h2>
                        <p>
                            D2F is provided "as is" without warranties of any kind. As a project developed at the University of Transport and Communications (UTC), we strive for excellence but are not liable for blockchain network failures, smart contract bugs, or event cancellations by third-party organizers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 uppercase tracking-wide">6. Privacy Policy</h2>
                        <p>
                            We value your privacy. While blockchain data is public, sensitive metadata is protected using Oasis Sapphire's confidential compute capabilities. Please refer to our separate Privacy Policy for details on how we handle off-chain data.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                    <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                        Last Updated: May 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
