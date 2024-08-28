import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from "@ton/core";

export type MainContractConfig = {
  number: number;
  address: Address;
};

export function mainContractConfigToCell(config: MainContractConfig) {
    return beginCell().storeUint(config.number, 32).storeAddress(config.address).endCell();
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

    async getData(provider: ContractProvider) {
        const { stack } = await provider.get("get_contract_storage_data", []);
        const data = {
            number: stack.readNumber(),
            recent_sender: stack.readAddress(),
        };
        return data;
    }
}
