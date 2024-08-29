import React, { useCallback, useEffect, useState } from 'react';

import {
    ChakraProvider,
    Button,
    Center,
    Flex,
    Box,
    Input,
    Heading,
    InputGroup,
    InputRightElement,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Spinner,
    Text,
    Spacer,
    Grid,
    Link,
    Divider,
    useToast,
    Tooltip,
    TableContainer,
    Table,
    Tbody,
    Tr,
    Td,
    Icon,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    SimpleGrid,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
    Address,
    beginCell,
    Builder,
    Cell,
    Dictionary,
    fromNano,
    OutAction,
    Slice,
    storeMessageRelaxed,
    toNano,
} from '@ton/core';
import { getEmulationWithStack } from './runner/runner';
import { EmulateWithStackResult, StackElement } from './runner/types';
import { customStringify, linkToTx } from './runner/utils';
import { GithubIcon } from './icons/github';
import { TonIcon } from './icons/ton';
import theme from './theme';
import { DocsIcon } from './icons/docs';
import { ElectorStorage, loadElectorState } from './parseElector';

export const getQueryParam = (param: string) => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get(param);
};

function App() {
    const txFromArg = decodeURIComponent(getQueryParam('tx') || '');
    const [testnet, setTestnet] = useState<boolean>(
        getQueryParam('testnet') === 'true'
    );

    const [parseRes, setParseRes] = useState<ElectorStorage | undefined>(
        undefined
    );

    async function fetchElector() {
        setParseRes(await loadElectorState());
    }

    useEffect(() => {
        fetchElector();
    }, []);

    const toast = useToast();

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied to clipboard',
            status: 'success',
            duration: 3000,
            position: 'bottom-left',

            containerStyle: {
                background: 'green.600',
                rounded: '0',
                fontSize: '12',
            },
        });
    }, []);

    return (
        <ChakraProvider theme={theme}>
            {testnet && (
                <Box bg={'red.500'} width="100%" mb="-13px">
                    <Center>
                        <Text color="white" mt="3px" mb="5px" fontSize="12">
                            Testnet version
                        </Text>
                    </Center>
                </Box>
            )}
            <Center>
                <Heading m="1rem">Elector State</Heading>
            </Center>
            <Center fontFamily="IntelOneMono" p="2">
                {parseRes ? dataElement(parseRes) : <Spinner />}
            </Center>
        </ChakraProvider>
    );
}

const myStringify = (action: any) =>
    JSON.stringify(
        action,
        (k, v) => {
            if (typeof v === 'bigint') {
                if (k.includes('weight')) return v.toString();
                return fromNano(v);
            }
            if (
                v &&
                typeof v == 'object' &&
                Object.hasOwn(v, 'type') &&
                v.type == 'Buffer'
            ) {
                if (k.includes('hash') || k.includes('pubkey'))
                    return Buffer.from(v.data).toString('hex').toUpperCase();
                else return new Address(-1, Buffer.from(v.data)).toString();
            }
            if (v instanceof Buffer) {
                if (k.includes('hash') || k.includes('pubkey'))
                    return Buffer.from(v).toString('hex').toUpperCase();
                else return new Address(-1, Buffer.from(v)).toString();
            }
            if (v instanceof Address) return v.toString();
            if (v instanceof Cell) return v.toBoc().toString('base64');
            if (v instanceof Dictionary) {
                const obj: Record<string, any> = {};
                for (const key of v.keys()) {
                    let keyToSet = key;
                    if (key instanceof Buffer) {
                        if (k !== 'frozen_dict')
                            keyToSet = new Address(-1, key);
                        else keyToSet = key.toString('hex').toUpperCase();
                    }
                    obj[keyToSet] = v.get(key);
                }
                return obj;
            }
            return v;
        },
        2
    );

function dataElement(action: ElectorStorage) {
    const json = myStringify(action);
    console.log(json);
    const unquotedJson = json
        .replace(/"([a-zA-Z0-9_]+)":/g, '$1:') // Remove quotes from keys
        .replace(/"(\d+)"/g, '$1') // Remove quotes from numbers
        .replace(/"\[(.*?)\]"/g, '[$1]') // Remove quotes from arrays
        .replace(/"([^"]+?)":/g, '$1:') // Remove quotes from string values
        .replace(/: "([^"]+)"/g, ': $1'); // Remove quotes from values

    return (
        <Box whiteSpace="pre-wrap">
            {unquotedJson}
            <CopyButton text={'Copy as json'} copyContent={json} bg="#B5E4FF" />
        </Box>
    );
}

function CopyButton({
    text,
    copyContent,
    bg,
}: {
    text: string;
    copyContent: string;
    bg: string;
}) {
    return (
        <Button
            width="100%"
            rounded="0"
            colorScheme="gray"
            border="1px solid"
            borderColor="#A3A3A3"
            bg={bg}
            fontSize="14"
            fontFamily="IntelOneMono Bold"
            onClick={() => navigator.clipboard.writeText(copyContent)}
        >
            {text}
        </Button>
    );
}

export default App;
