import { Cell, toNano } from "@ton/core";
import { hex } from "../build/main.compiled.json";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { MainContract } from "../wrappers/MainContract";
import "@ton/test-utils";

describe("main.fc contract tests", () => {
    let blockchain: Blockchain;
    let myContract: SandboxContract<MainContract>;
    let initWallet: SandboxContract<TreasuryContract>;
    let ownerWallet: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        initWallet = await blockchain.treasury("initWallet");
        ownerWallet = await blockchain.treasury("ownerWallet");

        const codeCell = Cell.fromBoc(Buffer.from(hex, "hex"))[0];

        myContract = blockchain.openContract(
            await MainContract.createFromConfig(
                { 
                    number: 0, 
                    address: initWallet.address,
                    owner_address: ownerWallet.address,
                }, 
                codeCell
            )
        );
    });

    it("should successfully increase counter in contract and get the proper most recent sender address", async () => {
        const senderWallet = await blockchain.treasury("sender");

        const sentMessageResult = await myContract.sendIncrement(
            senderWallet.getSender(), 
            toNano("0.05"),
            1
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: true
        });

        const data = await myContract.getData();

        expect(data.recent_sender.toString()).toBe(senderWallet.address.toString());
        expect(data.number).toEqual(1);
    });

    it("successfully deposits funds", async () => {
        const senderWallet = await blockchain.treasury("senderWallet");

        const depositMessageResult = await myContract.sendDeposit(
            senderWallet.getSender(), 
            toNano("5")
        );

        expect(depositMessageResult.transactions).toHaveTransaction({
            from: senderWallet.address,
            to: myContract.address,
            success: true
        });

        const balance = (await myContract.getContractBalance()).balance;

        expect(balance).toBeGreaterThan(toNano("4.99"));
    });

    it("should return deposit funds as no command is sent", async () => {
        const senderWallet = await blockchain.treasury("sender");

        const sentMessageResult = await myContract.sendNoCodeDeposit(
            senderWallet.getSender(), 
            toNano("5")
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: myContract.address,
            to: senderWallet.address,
            success: true,
        });

        const balance = (await myContract.getContractBalance()).balance;

        expect(balance).toBe(0);
    });

    it("successfully withdraws funds on behalf of owner", async () => {
        const sender = await blockchain.treasury("sender");

        await myContract.sendDeposit(sender.getSender(), toNano("5"));

        const sentMessageResult = await myContract.sendWithdrawalRequest(
            ownerWallet.getSender(), 
            toNano("0.05"),
            toNano("1")
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: myContract.address,
            to: ownerWallet.address,
            success: true,
            value: toNano(1)
        });
    });

    it("fails to withdraw funds on behalf of non-owner", async () => {
        const sender = await blockchain.treasury("sender");

        await myContract.sendDeposit(sender.getSender(), toNano("5"));

        const sentMessageResult = await myContract.sendWithdrawalRequest(
            sender.getSender(), 
            toNano("0.05"),
            toNano("1")
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: sender.address,
            to: myContract.address,
            success: false,
            exitCode: 103,
        });
    });

    it("fails to withdraw funds because lack of balance", async () => {

        const sentMessageResult = await myContract.sendWithdrawalRequest(
            ownerWallet.getSender(), 
            toNano("0.05"),
            toNano("1")
        );

        expect(sentMessageResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: myContract.address,
            success: false,
            exitCode: 104,
        });
    });
});