import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from "@ton/core";

export type MainContractConfig = {
  number: number;
  address: Address;
  owner_address: Address
};

export function mainContractConfigToCell(config: MainContractConfig) {
    return beginCell().storeUint(config.number, 32).storeAddress(config.address).storeAddress(config.owner_address).endCell();
}

export class MainContract implements Contract {
    constructor (
        readonly address: Address,
        readonly init?: { code: Cell, data: Cell }
    ) {}

    static createFromConfig (config: MainContractConfig, code: Cell, workchain = 0) {
        const data = mainContractConfigToCell(config);
        const init = { code, data };
        const address = contractAddress(workchain, init);

        return new MainContract(address, init);
    }

    async sendIncrement(
        provider: ContractProvider,
        sender: Sender,
        value: bigint,
        increment_by: number
    ) {
        const opcode = 1;
        const msg_body = beginCell()
            .storeUint(opcode, 32)
            .storeUint(increment_by, 32)
        .endCell();

        await provider.internal(
            sender,
            {
                value: value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: msg_body
            }
        );
    }

    async sendDeposit(provider: ContractProvider, sender: Sender, value: bigint) {
        const opcode = 2;
        const msg_body = beginCell()
            .storeUint(opcode, 32)
        .endCell();

        await provider.internal(
            sender,
            {
                value: value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: msg_body
            }
        );
    }

    async sendNoCodeDeposit(provider: ContractProvider, sender: Sender, value: bigint) {
        await provider.internal(
            sender,
            {
                value: value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: beginCell().endCell()
            }
        );
    }

    async sendWithdrawalRequest(provider: ContractProvider, sender: Sender, value: bigint, amount: bigint) {
        const opcode = 3;
        const msg_body = beginCell()
            .storeUint(opcode, 32)
            .storeCoins(amount)
        .endCell();

        await provider.internal(
            sender,
            {
                value: value,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                body: msg_body
            }
        );
    }

    async getData(provider: ContractProvider) {
        const { stack } = await provider.get("get_contract_storage_data", []);
        const data = {
            number: stack.readNumber(),
            recent_sender: stack.readAddress(),
        };
        return data;
    }

    async getContractBalance(provider: ContractProvider) {
        const { stack } = await provider.get("get_contract_balance", []);
        const data = {
            balance: stack.readNumber()
        };
        return data;
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell()
        })
    }
}
