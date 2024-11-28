import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Usuario} from "./Usuario";
import {Terminal} from "./Terminal";

@Entity()
export class Marcacion extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    ci: number
    @Column({type: 'datetime', nullable: true})
    fechaMarcaje: Date;
    @ManyToOne(() => Terminal, (terminal) => terminal.marcaciones)
    terminal: Terminal
}