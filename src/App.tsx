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
    fromNano,
    OutAction,
    Slice,
    storeMessageRelaxed,
} from '@ton/core';
import { getEmulationWithStack } from './runner/runner';
import { EmulateWithStackResult, StackElement } from './runner/types';
import { customStringify, linkToTx } from './runner/utils';
import { GithubIcon } from './icons/github';
import { TonIcon } from './icons/ton';
import theme from './theme';
import { DocsIcon } from './icons/docs';

type KeyPressHandler = () => void;

const useGlobalKeyPress = (key: string, action: KeyPressHandler) => {
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === key) {
                action();
            }
        };

        window.addEventListener('keyup', handleKeyPress);

        return () => {
            window.removeEventListener('keyup', handleKeyPress);
        };
    }, [key, action]);
};

export const getQueryParam = (param: string) => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get(param);
};

function App() {
    const testnet = getQueryParam('testnet') === 'true';
    const txFromArg = decodeURIComponent(getQueryParam('tx') || '');

    const [link, setLink] = useState<string>(txFromArg);
    const [isErrorOpen, setIsErrorOpen] = useState(false);
    const [areLogsOpen, setAreLogsOpen] = useState(false);
    const [isC5Open, setIsC5Open] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [emulationStatus, setEmulationStatus] = useState<string>('');
    const [emulationResult, setEmulationResult] = useState<
        EmulateWithStackResult | undefined
    >(undefined);
    const [processing, setProcessing] = useState(false);
    const [selectedStep, setSelectedStep] = useState<number>(0);

    const updateURLWithTx = (tx: string) => {
        const encodedTx = encodeURIComponent(tx);
        const url = new URL(window.location.href);
        if (testnet) {
            url.searchParams.set('testnet', testnet.toString());
        }
        url.searchParams.set('tx', encodedTx);
        window.history.pushState({}, '', url.toString());
    };

    async function viewTransaction() {
        console.log('Viewing transaction:', link);
        setErrorText('');
        setEmulationResult(undefined);
        setProcessing(true);
        try {
            const tx = await linkToTx(link, testnet);
            const emulation = await getEmulationWithStack(
                tx,
                testnet,
                setEmulationStatus
            );
            setEmulationResult(emulation);
            updateURLWithTx(tx.hash.toString('hex') || '');
        } catch (e) {
            if (e instanceof Error) {
                setErrorText(e.message);
                setIsErrorOpen(true);
            }
            console.error(e);
        }
        setProcessing(false);
    }

    function onCloseErrorModal() {
        setIsErrorOpen(false);
        setErrorText('');
    }

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

    const prevStep = () => {
        if (selectedStep > 0) {
            setSelectedStep(selectedStep - 1);
        }
    };

    useGlobalKeyPress('ArrowLeft', prevStep);

    const nextStep = () => {
        if (
            emulationResult &&
            selectedStep < emulationResult.computeLogs.length - 1
        ) {
            setSelectedStep(selectedStep + 1);
        }
    };
    useGlobalKeyPress('ArrowRight', nextStep);

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

            <Flex mt="2rem" mx="2rem">
                <Spacer />
                <Link
                    isExternal
                    aria-label="TVM Retracer GitHub page"
                    href="https://github.com/ton-blockchain/tvm-web-viewer/"
                >
                    <Icon
                        as={GithubIcon}
                        display="block"
                        transition="color 0.2s"
                        color="gray.500"
                        fontSize="1.5rem"
                        _hover={{ color: 'gray.800' }}
                    />
                </Link>
                <Link
                    ml="0.4rem"
                    isExternal
                    aria-label="TON Blockchain website"
                    href="https://ton.org"
                >
                    <Icon
                        as={TonIcon}
                        display="block"
                        transition="color 0.2s"
                        color="gray.500"
                        fontSize="1.5rem"
                        _hover={{ color: 'gray.800' }}
                    />
                </Link>
                <Link
                    ml="0.4rem"
                    isExternal
                    aria-label="TVM Docs"
                    href="https://docs.ton.org/learn/tvm-instructions/instructions"
                >
                    <Icon
                        as={DocsIcon}
                        display="block"
                        transition="color 0.2s"
                        color="gray.500"
                        fontSize="1.5rem"
                        _hover={{ color: 'gray.800' }}
                    />
                </Link>
            </Flex>
            <Center>
                <Box width="80%" alignContent="center" mt="4rem">
                    <Heading mb="0.5rem">TVM Retracer</Heading>
                    <InputGroup>
                        <Input
                            placeholder="Transaction link (any explorer)"
                            rounded="0"
                            size="md"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            type="url"
                            onKeyUp={(e) => {
                                if (e.key === 'Enter') {
                                    viewTransaction();
                                }
                            }}
                        ></Input>
                        <InputRightElement width="6rem">
                            <Button
                                fontSize="14.5px"
                                fontFamily="IntelOneMono Bold"
                                variant="solid"
                                h="95%"
                                rounded="0"
                                colorScheme="blue"
                                onClick={viewTransaction}
                            >
                                Emulate
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                    {emulationResult ? (
                        <Box>
                            <Grid
                                mt="1rem"
                                fontSize="12"
                                templateColumns="repeat(3, 1fr)"
                                gap="1rem"
                            >
                                <Box>
                                    <Text>
                                        Sender: <br />
                                        {emulationResult.sender?.toString()}
                                    </Text>
                                    <Text>
                                        Contract: <br />
                                        {emulationResult.contract?.toString()}
                                    </Text>
                                    <Text>
                                        Amount:{' '}
                                        {emulationResult.amount
                                            ? fromNano(
                                                  emulationResult.amount || 0n
                                              ) + ' TON'
                                            : 'none'}
                                    </Text>
                                    <Text>
                                        Time:{' '}
                                        {new Date(
                                            emulationResult.utime * 1000 || 0
                                        ).toLocaleString()}
                                    </Text>
                                    <Text>
                                        Timestamp: {emulationResult.utime}
                                    </Text>
                                    <Text>
                                        Lt: {emulationResult.lt.toString()}
                                    </Text>
                                </Box>

                                {/* <Spacer /> */}
                                <Box ml="6rem">
                                    <Text>
                                        Balance before:{' '}
                                        {fromNano(
                                            emulationResult.money.balanceBefore
                                        )}{' '}
                                        TON
                                    </Text>

                                    <Text>
                                        Compute fees:{' '}
                                        {emulationResult.computeInfo !=
                                        'skipped'
                                            ? fromNano(
                                                  emulationResult.computeInfo
                                                      .gasFees
                                              ) + ' TON'
                                            : 'none'}
                                    </Text>
                                    <Text>
                                        Total fees:{' '}
                                        {fromNano(
                                            emulationResult.money.totalFees
                                        )}{' '}
                                        TON
                                    </Text>
                                    <Text>
                                        Total sent:{' '}
                                        {fromNano(
                                            emulationResult.money.sentTotal
                                        )}{' '}
                                        TON
                                    </Text>
                                    <Text>
                                        Balance after:{' '}
                                        {fromNano(
                                            emulationResult.money.balanceAfter
                                        )}{' '}
                                        TON
                                    </Text>
                                </Box>

                                {/* <Spacer /> */}
                                <Box>
                                    <TxLink
                                        link={emulationResult.links.toncx}
                                        explorer="ton.cx"
                                    />

                                    <TxLink
                                        link={emulationResult.links.tonviewer}
                                        explorer="tonviewer.com"
                                    />
                                    <TxLink
                                        link={emulationResult.links.tonscan}
                                        explorer="tonscan.org"
                                    />
                                    <TxLink
                                        link={emulationResult.links.toncoin}
                                        explorer="explorer.toncoin.org"
                                    />
                                    <TxLink
                                        link={emulationResult.links.dton}
                                        explorer="dton.io"
                                    />
                                    <Flex mt="1.5rem">
                                        <Spacer />
                                        <Button
                                            px="2"
                                            mr="0.5rem"
                                            size="sm"
                                            rounded="0"
                                            fontSize="12"
                                            fontFamily="IntelOneMono"
                                            border="1px solid"
                                            borderColor="#979CCA"
                                            bg="#D5D9FF"
                                            leftIcon=<ExternalLinkIcon mr="-4px" />
                                            onClick={() => setIsC5Open(true)}
                                        >
                                            C5
                                        </Button>
                                        <Button
                                            size="sm"
                                            rounded="0"
                                            fontSize="12"
                                            fontFamily="IntelOneMono"
                                            border="1px solid"
                                            borderColor="#ACACAC"
                                            bg="#D9D9D9"
                                            leftIcon=<ExternalLinkIcon />
                                            onClick={() => setAreLogsOpen(true)}
                                        >
                                            Logs
                                        </Button>
                                    </Flex>
                                </Box>
                            </Grid>
                            {emulationResult.computeInfo !== 'skipped' ? (
                                <Box>
                                    <Box
                                        overflowY="scroll"
                                        height="34rem"
                                        border="solid"
                                        borderColor="#E2E8F0"
                                        bgColor="#F4F4F4"
                                        w="100%"
                                        mt="1rem"
                                        py="1.2rem"
                                        px="2rem"
                                    >
                                        <Flex fontSize="12">
                                            <Spacer />
                                            <Text>
                                                Success:{' '}
                                                {emulationResult.computeInfo.success.toString()}
                                            </Text>
                                            <Spacer />
                                            <Text>
                                                Exit code:{' '}
                                                {
                                                    emulationResult.computeInfo
                                                        .exitCode
                                                }
                                            </Text>
                                            <Spacer />
                                            <Text>
                                                Vm steps:{' '}
                                                {
                                                    emulationResult.computeInfo
                                                        .vmSteps
                                                }
                                            </Text>

                                            <Spacer />
                                            <Text>
                                                Gas used:{' '}
                                                {emulationResult.computeInfo.gasUsed.toString()}
                                            </Text>
                                            <Spacer />
                                        </Flex>
                                        <Flex mt="1rem">
                                            <Box>
                                                {emulationResult.computeLogs.map(
                                                    (log, i) => (
                                                        <Box key={i}>
                                                            <Button
                                                                variant="link"
                                                                fontFamily="IntelOneMono"
                                                                textColor="#5B5B5B"
                                                                fontSize="14"
                                                                onClick={() => {
                                                                    setSelectedStep(
                                                                        i
                                                                    );
                                                                }}
                                                            >
                                                                <Tooltip
                                                                    label={
                                                                        !log.error
                                                                            ? `${log.price ? `Step cost: ${log.price}  ` : ''}Gas remaining: ${log.gasRemaining}`
                                                                            : `Exit code ${log.error.code}: ${log.error.text}`
                                                                    }
                                                                    placement="right"
                                                                    hasArrow
                                                                    openDelay={
                                                                        100
                                                                    }
                                                                    fontSize="12"
                                                                >
                                                                    <Text
                                                                        bgColor={
                                                                            log.error
                                                                                ? 'red.200'
                                                                                : selectedStep ==
                                                                                    i
                                                                                  ? 'white'
                                                                                  : undefined
                                                                        }
                                                                    >
                                                                        {i + 1}.{' '}
                                                                        {shortStep(
                                                                            log.instruction
                                                                        )}
                                                                    </Text>
                                                                </Tooltip>
                                                            </Button>
                                                        </Box>
                                                    )
                                                )}
                                            </Box>
                                            <Spacer />
                                            {emulationResult.computeLogs && (
                                                <Box position="relative">
                                                    <Box
                                                        position="sticky"
                                                        zIndex="1"
                                                        w="25rem"
                                                        bg="#D9D9D9"
                                                        top="1rem"
                                                        py="1rem"
                                                        border="1px dashed"
                                                        borderColor="#A2A2A2"
                                                    >
                                                        <Flex px="1rem">
                                                            <Tooltip
                                                                label="Use Left key"
                                                                openDelay={500}
                                                                fontSize="12"
                                                            >
                                                                <Button
                                                                    mt="0.5rem"
                                                                    mr="1rem"
                                                                    variant="link"
                                                                    p="0"
                                                                    fontSize="14"
                                                                    color="#000"
                                                                    onClick={
                                                                        prevStep
                                                                    }
                                                                >
                                                                    {'<'}
                                                                </Button>
                                                            </Tooltip>
                                                            <Spacer />
                                                            <Center>
                                                                <Text
                                                                    fontFamily="IntelOneMono Bold"
                                                                    fontSize="14"
                                                                    textAlign="center"
                                                                >
                                                                    {selectedStep +
                                                                        1}
                                                                    .{' '}
                                                                    {shortStep(
                                                                        emulationResult
                                                                            .computeLogs[
                                                                            selectedStep
                                                                        ]
                                                                            .instruction
                                                                    )}
                                                                </Text>
                                                            </Center>
                                                            <Spacer />
                                                            <Tooltip
                                                                label="Use Right key"
                                                                openDelay={500}
                                                                fontSize="12"
                                                            >
                                                                <Button
                                                                    mt="0.5rem"
                                                                    ml="1rem"
                                                                    variant="link"
                                                                    p="0"
                                                                    fontSize="14"
                                                                    color="#000"
                                                                    onClick={
                                                                        nextStep
                                                                    }
                                                                >
                                                                    {'>'}
                                                                </Button>
                                                            </Tooltip>
                                                        </Flex>
                                                        <Center>
                                                            <Text fontSize="12">
                                                                Stack after:
                                                            </Text>
                                                        </Center>
                                                        <TableContainer
                                                            mt="0.5rem"
                                                            overflowY="scroll"
                                                            height="25rem"
                                                        >
                                                            {emulationResult
                                                                .computeLogs[
                                                                selectedStep
                                                            ].error && (
                                                                <Box
                                                                    bgColor="red.200"
                                                                    fontFamily="IntelOneMono Bold"
                                                                    fontSize="12"
                                                                >
                                                                    <Center pt="2">
                                                                        <Text>
                                                                            Failed
                                                                            with
                                                                            exit
                                                                            code{' '}
                                                                            {
                                                                                emulationResult
                                                                                    .computeLogs[
                                                                                    selectedStep
                                                                                ]
                                                                                    .error!
                                                                                    .code
                                                                            }
                                                                        </Text>
                                                                    </Center>
                                                                    <Center
                                                                        whiteSpace="pre-wrap"
                                                                        p="2"
                                                                        textAlign="center"
                                                                    >
                                                                        {
                                                                            emulationResult
                                                                                .computeLogs[
                                                                                selectedStep
                                                                            ]
                                                                                .error!
                                                                                .text
                                                                        }
                                                                    </Center>
                                                                </Box>
                                                            )}
                                                            <Table
                                                                size="sm"
                                                                variant="striped"
                                                            >
                                                                <Tbody>
                                                                    {emulationResult.computeLogs[
                                                                        selectedStep
                                                                    ].stackAfter
                                                                        .toReversed()
                                                                        .map(
                                                                            (
                                                                                item,
                                                                                i
                                                                            ) =>
                                                                                stackItemElement(
                                                                                    item,
                                                                                    i,
                                                                                    handleCopy
                                                                                )
                                                                        )}
                                                                </Tbody>
                                                            </Table>
                                                        </TableContainer>
                                                    </Box>
                                                </Box>
                                            )}
                                        </Flex>
                                    </Box>
                                    <Box
                                        m="1rem"
                                        fontSize="10"
                                        opacity="50%"
                                        fontFamily="IntelOneMono"
                                    >
                                        <Center>
                                            Used Emulator from commit{' '}
                                            <Link
                                                mx="1"
                                                href={`https://github.com/ton-blockchain/ton/tree/${emulationResult.emulatorVersion.commitHash}`}
                                            >
                                                {emulationResult.emulatorVersion.commitHash.slice(
                                                    0,
                                                    7
                                                )}
                                            </Link>
                                            at{' '}
                                            {
                                                emulationResult.emulatorVersion
                                                    .commitDate
                                            }
                                        </Center>
                                    </Box>
                                </Box>
                            ) : (
                                <Center>
                                    <Text>Compute phase was skipped</Text>
                                </Center>
                            )}
                        </Box>
                    ) : (
                        <></>
                    )}
                    {processing ? (
                        <Box>
                            <Center>
                                <Spinner
                                    mt="2rem"
                                    thickness="4px"
                                    speed="0.65s"
                                    emptyColor="gray.200"
                                    color="blue.500"
                                    size="xl"
                                />
                            </Center>
                            <Center>
                                <Text mt="0.5rem" fontSize="14">
                                    {emulationStatus}
                                </Text>
                            </Center>
                        </Box>
                    ) : (
                        <></>
                    )}
                </Box>
            </Center>

            <Modal
                isOpen={isC5Open}
                isCentered
                scrollBehavior="inside"
                size="full"
                onClose={() => setIsC5Open(false)}
            >
                <ModalOverlay />
                <ModalContent rounded="0">
                    <ModalHeader fontFamily="IntelOneMono Bold">
                        Actions cell (C5)
                    </ModalHeader>
                    <ModalCloseButton />
                    {emulationResult ? (
                        <ModalBody
                            fontSize="12"
                            fontFamily="IntelOneMono"
                            whiteSpace="pre-wrap"
                        >
                            <SimpleGrid minChildWidth="27rem" spacing="2rem">
                                {emulationResult.actions.length > 0 ? (
                                    emulationResult.actions.map(
                                        outActionElement
                                    )
                                ) : (
                                    <Text>No actions</Text>
                                )}
                            </SimpleGrid>
                        </ModalBody>
                    ) : (
                        <></>
                    )}
                    <ModalFooter>
                        <Button
                            rounded="0"
                            size="sm"
                            fontFamily="IntelOneMono"
                            colorScheme="gray"
                            border="1px solid"
                            borderColor="#ACACAC"
                            bg="#D9D9D9"
                            mr={3}
                            onClick={() => setIsC5Open(false)}
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal
                isOpen={areLogsOpen}
                isCentered
                scrollBehavior="inside"
                size="full"
                onClose={() => setAreLogsOpen(false)}
            >
                <ModalOverlay />
                <ModalContent rounded="0">
                    <ModalHeader fontFamily="IntelOneMono Bold">
                        Executor logs
                    </ModalHeader>
                    <ModalCloseButton />
                    {emulationResult ? (
                        <ModalBody
                            fontSize="12"
                            fontFamily="IntelOneMono"
                            whiteSpace="pre-wrap"
                        >
                            {emulationResult.executorLogs}
                        </ModalBody>
                    ) : (
                        <></>
                    )}
                    <ModalFooter>
                        <Button
                            rounded="0"
                            size="sm"
                            fontFamily="IntelOneMono"
                            colorScheme="gray"
                            border="1px solid"
                            borderColor="#ACACAC"
                            bg="#D9D9D9"
                            mr={3}
                            onClick={() => setAreLogsOpen(false)}
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal isOpen={isErrorOpen} isCentered onClose={onCloseErrorModal}>
                <ModalOverlay />
                <ModalContent rounded="0">
                    <ModalHeader fontFamily="IntelOneMono Bold">
                        Error occured
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>{errorText}</ModalBody>
                    <ModalFooter>
                        <Button
                            rounded="0"
                            fontFamily="IntelOneMono Bold"
                            colorScheme="red"
                            mr={3}
                            onClick={onCloseErrorModal}
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </ChakraProvider>
    );
}

function outActionElement(action: OutAction, i: number) {
    const json = JSON.stringify(
        action,
        (_, v) => {
            if (typeof v === 'bigint') return v.toString();
            if (v instanceof Address) return v.toString();
            if (v instanceof Cell) return v.toBoc().toString('base64');
            return v;
        },
        2
    );
    const unquotedJson = json
        .replace(/"([a-zA-Z0-9_]+)":/g, '$1:') // Remove quotes from keys
        .replace(/"(\d+)"/g, '$1') // Remove quotes from numbers
        .replace(/"\[(.*?)\]"/g, '[$1]') // Remove quotes from arrays
        .replace(/"([^"]+?)":/g, '$1:') // Remove quotes from string values
        .replace(/: "([^"]+)"/g, ': $1'); // Remove quotes from values

    // const text = customStringify(json);
    if (action.type === 'sendMsg') {
        const msgCell = beginCell()
            .store(storeMessageRelaxed(action.outMsg))
            .asCell();
        return (
            <Card
                width="100%"
                m="1rem"
                rounded="0"
                border="1px solid"
                borderColor="#788892"
                bg="#D8F1FF"
                shadow="none"
            >
                <CardHeader
                    fontFamily="IntelOneMono Bold"
                    alignSelf="center"
                    fontSize="20"
                    mb="-1rem"
                >
                    {i + 1}. Send Message
                </CardHeader>
                <CardBody fontSize="10" whiteSpace="pre-wrap">
                    {unquotedJson}
                </CardBody>
                <CardFooter>
                    <Flex direction="column" width="100%" gap="0.5rem">
                        <CopyButton
                            text={'Copy message cell'}
                            copyContent={msgCell.toBoc().toString('base64')}
                            bg="#B5E4FF"
                        />
                        <CopyButton
                            text={'Copy message body'}
                            copyContent={
                                action.outMsg.body?.toString('base64') || ''
                            }
                            bg="#B5E4FF"
                        />
                        <CopyButton
                            text={'Copy action as json'}
                            copyContent={json}
                            bg="#B5E4FF"
                        />
                    </Flex>
                </CardFooter>
            </Card>
        );
    } else if (action.type === 'setCode') {
        return (
            <Card
                width="27rem"
                m="1rem"
                rounded="0"
                border="1px solid"
                borderColor="#A89871"
                bg="#FFEAB6"
                shadow="none"
            >
                <CardHeader
                    fontFamily="IntelOneMono Bold"
                    alignSelf="center"
                    fontSize="20"
                    mb="-1rem"
                >
                    {i + 1}. Set Code
                </CardHeader>
                <CardBody fontSize="10" whiteSpace="pre-wrap">
                    {unquotedJson}
                </CardBody>
                <CardFooter>
                    <Flex direction="column" width="100%" gap="0.5rem">
                        <CopyButton
                            text={'Copy new code cell'}
                            copyContent={action.newCode
                                .toBoc()
                                .toString('base64')}
                            bg="#FFD392"
                        />
                        <CopyButton
                            text={'Copy action as json'}
                            copyContent={json}
                            bg="#FFD392"
                        />
                    </Flex>
                </CardFooter>
            </Card>
        );
    } else if (action.type === 'reserve') {
        return (
            <Card
                width="27rem"
                m="1rem"
                rounded="0"
                border="1px solid"
                borderColor="#8100AE"
                bg="#F6DBFF"
                shadow="none"
            >
                <CardHeader
                    fontFamily="IntelOneMono Bold"
                    alignSelf="center"
                    fontSize="20"
                    mb="-1rem"
                >
                    {i + 1}. Raw Reserve
                </CardHeader>
                <CardBody fontSize="10" whiteSpace="pre-wrap">
                    {unquotedJson}
                </CardBody>
                <CardFooter>
                    <Flex direction="column" width="100%" gap="0.5rem">
                        <CopyButton
                            text={'Copy coins'}
                            copyContent={action.currency.coins.toString()}
                            bg="#EBB6FE"
                        />
                        <CopyButton
                            text={'Copy action as json'}
                            copyContent={json}
                            bg="#EBB6FE"
                        />
                    </Flex>
                </CardFooter>
            </Card>
        );
    } else if (action.type == 'changeLibrary') {
        return (
            <Card
                width="27rem"
                m="1rem"
                rounded="0"
                border="1px solid"
                borderColor="#039F01"
                bg="#DCFFDB"
                shadow="none"
            >
                <CardHeader
                    fontFamily="IntelOneMono Bold"
                    alignSelf="center"
                    fontSize="20"
                    mb="-1rem"
                >
                    {i + 1}. Change Library
                </CardHeader>
                <CardBody fontSize="10" whiteSpace="pre-wrap">
                    {unquotedJson}
                </CardBody>
                <CardFooter>
                    <Flex direction="column" width="100%" gap="0.5rem">
                        {action.libRef.type == 'hash' ? (
                            <CopyButton
                                text={'Copy lib hash'}
                                copyContent={action.libRef.libHash.toString(
                                    'base64'
                                )}
                                bg="#A4F7A3"
                            />
                        ) : (
                            <CopyButton
                                text={'Copy lib cell'}
                                copyContent={action.libRef.library
                                    .toBoc()
                                    .toString('base64')}
                                bg="#A4F7A3"
                            />
                        )}
                        <CopyButton
                            text={'Copy action as json'}
                            copyContent={json}
                            bg="#A4F7A3"
                        />
                    </Flex>
                </CardFooter>
            </Card>
        );
    }
    return <> </>;
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
            fontSize="12"
            onClick={() => navigator.clipboard.writeText(copyContent)}
        >
            {text}
        </Button>
    );
}

function stackItemElement(
    item: StackElement,
    i: number,
    handleCopy: (text: string) => void
) {
    if (Array.isArray(item)) {
        return (
            <>
                <Tr>
                    <Td>
                        <Box key={i}>
                            <Text>{i}. Tuple</Text>
                            <Flex mt="0.5rem">
                                <Divider orientation="vertical" />
                                <TableContainer>
                                    <Table
                                        size="sm"
                                        variant="striped"
                                        colorScheme="yellow"
                                    >
                                        <Tbody>
                                            {item.map((subItem, j) =>
                                                stackItemElement(
                                                    subItem,
                                                    j,
                                                    handleCopy
                                                )
                                            )}
                                        </Tbody>
                                    </Table>
                                </TableContainer>
                            </Flex>
                        </Box>
                    </Td>
                </Tr>
            </>
        );
    }
    let strRes: string;
    let copyContent = '';
    if (item instanceof Cell) {
        strRes = item.bits.toString();
        if (strRes.length > 14)
            strRes = strRes.slice(0, 7) + '...' + strRes.slice(-7);
        strRes =
            `Cell {${strRes}}` +
            (item.refs.length > 0 ? ` + ${item.refs.length} refs` : '');
        copyContent = item.toBoc().toString('hex');
    }
    //
    else if (item instanceof Slice) {
        item = item.asCell().asSlice();
        strRes = item.loadBits(item.remainingBits).toString();
        if (strRes.length > 14)
            strRes = strRes.slice(0, 7) + '...' + strRes.slice(-7);
        strRes =
            `Slice {${strRes}}` +
            (item.remainingRefs > 0 ? ` + ${item.remainingRefs} refs` : '');
        copyContent = item.asCell().toBoc().toString('hex');
    }
    //
    else if (item instanceof Builder) {
        strRes = item.asCell().bits.toString();
        if (strRes.length > 14)
            strRes = strRes.slice(0, 7) + '...' + strRes.slice(-7);
        strRes =
            `Builder {${strRes}}` +
            (item.refs > 0 ? ` + ${item.refs} refs` : '');
        copyContent = item.asCell().toBoc().toString('hex');
    }
    //
    else if (item == null) {
        strRes = 'null';
        copyContent = 'null';
    }
    //
    else if (typeof item === 'string') {
        strRes = item;
        if (strRes.length > 30)
            strRes = strRes.slice(0, 26) + '...' + strRes.slice(-4);
        copyContent = item;
    }
    //
    else {
        strRes = item.toString();
        if (strRes.length > 30)
            strRes = strRes.slice(0, 15) + '...' + strRes.slice(-15);
        copyContent = item.toString();
    }
    return (
        <Tr key={i}>
            <Td>
                <Box>
                    <Link onClick={() => handleCopy(copyContent)}>
                        {i}. {strRes}
                    </Link>
                </Box>
            </Td>
        </Tr>
    );
}

function shortStep(step: string) {
    if (step.length > 24) return step.slice(0, 19) + '...' + step.slice(-5);
    return step;
}

function TxLink({ explorer, link }: { explorer: string; link: string }) {
    return (
        <Flex>
            <Spacer />
            <Link
                href={link}
                fontSize="12"
                color="blue.400"
                textAlign="right"
                isExternal
                _hover={{ textDecoration: 'none' }}
                textDecoration="underline"
            >
                {explorer}
            </Link>
        </Flex>
    );
}

export default App;
